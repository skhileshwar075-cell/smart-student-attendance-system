package com.smartattend.ui.admin

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.smartattend.R
import com.smartattend.domain.model.PivotReportRow

class AdminPivotReportAdapter : ListAdapter<PivotReportRow, AdminPivotReportAdapter.VH>(DIFF) {

    class VH(view: View) : RecyclerView.ViewHolder(view) {
        val tvStudentName: TextView = view.findViewById(R.id.tvStudentName)
        val tvStudentCode: TextView = view.findViewById(R.id.tvStudentCode)
        val tvMetrics: TextView = view.findViewById(R.id.tvMetrics)
        val tvStatusSummary: TextView = view.findViewById(R.id.tvStatusSummary)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH =
        VH(LayoutInflater.from(parent.context).inflate(R.layout.item_admin_pivot_report, parent, false))

    override fun onBindViewHolder(holder: VH, position: Int) {
        val item = getItem(position)
        holder.tvStudentName.text = item.name
        holder.tvStudentCode.text = item.rollNumber ?: item.studentCode ?: "—"
        holder.tvMetrics.text = "${item.presentCount}/${item.totalClasses} present · ${String.format("%.1f", item.percentage)}%"
        holder.tvStatusSummary.text = item.dateValues.take(10).joinToString(" ")
    }

    companion object {
        private val DIFF = object : DiffUtil.ItemCallback<PivotReportRow>() {
            override fun areItemsTheSame(a: PivotReportRow, b: PivotReportRow) = a.studentCode == b.studentCode && a.name == b.name
            override fun areContentsTheSame(a: PivotReportRow, b: PivotReportRow) = a == b
        }
    }
}
