import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import PaginationControls from '@/components/PaginationControls.vue'

describe('PaginationControls', () => {
  it('displays one-based pages and emits zero-based page indexes', async () => {
    const wrapper = mount(PaginationControls, { props: { page: 1, totalPages: 3 } })

    expect(wrapper.text()).toContain('Página 2 de 3')
    await wrapper.get('button:first-of-type').trigger('click')
    await wrapper.get('button:last-of-type').trigger('click')

    expect(wrapper.emitted('change')).toEqual([[0], [2]])
  })

  it('hides controls when there is only one page', () => {
    const wrapper = mount(PaginationControls, { props: { page: 0, totalPages: 1 } })

    expect(wrapper.find('nav').exists()).toBe(false)
  })
})
